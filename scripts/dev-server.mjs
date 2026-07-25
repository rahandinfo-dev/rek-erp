#!/usr/bin/env node
/**
 * Single-instance launcher for `next dev`.
 *
 * Next.js refuses to start a second dev server for the same project (it holds
 * an exclusive handle on `.next/dev/lock`) and falls back to port 3001 when
 * 3000 is taken. On Windows the process chain is
 * `npm -> cmd.exe -> node next dev -> node start-server.js`, and closing a
 * terminal or pressing Ctrl-C only signals the top of that chain, so the
 * grandchildren survive as orphans that keep holding the port and the lock.
 *
 * This launcher reclaims those leftovers before starting, and spawns the Next
 * binary directly (no cmd.exe shim) so the tree is one level shallower and
 * dies with the terminal.
 */

import { execFileSync, spawn } from "node:child_process";
import net from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";
const port = Number.parseInt(process.env.PORT || "3000", 10);
const forwardedArgs = process.argv.slice(2);

const NEXT_BIN = resolve(projectRoot, "node_modules/next/dist/bin/next");
const NEXT_PROCESS_MARKERS = [
  "next/dist/bin/next",
  "next/dist/server/lib/start-server.js",
];

function normalize(value) {
  return value.replace(/\\/g, "/").toLowerCase();
}

function capture(file, args) {
  try {
    return execFileSync(file, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch {
    return "";
  }
}

/** Every running process, as `{ pid, command }`. */
function listProcesses() {
  const output = isWindows
    ? capture("powershell.exe", [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' } | ForEach-Object { $_.ProcessId.ToString() + '|' + $_.CommandLine }",
      ])
    : capture("ps", ["-eo", "pid=,args="]);

  const processes = [];
  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const separator = isWindows ? trimmed.indexOf("|") : trimmed.indexOf(" ");
    if (separator < 1) continue;
    const pid = Number.parseInt(trimmed.slice(0, separator), 10);
    const command = trimmed.slice(separator + 1).trim();
    if (Number.isInteger(pid) && command) processes.push({ pid, command });
  }
  return processes;
}

/** Next dev processes that belong to this project — and are not us. */
function findProjectDevServers() {
  const root = normalize(projectRoot);
  return listProcesses().filter(({ pid, command }) => {
    if (pid === process.pid || pid === process.ppid) return false;
    const cmd = normalize(command);
    if (!cmd.includes(root)) return false;
    return NEXT_PROCESS_MARKERS.some((marker) => cmd.includes(marker));
  });
}

function killTree(pid) {
  if (isWindows) {
    capture("taskkill", ["/PID", String(pid), "/T", "/F"]);
    return;
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    /* already gone */
  }
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

function portIsFree(target) {
  return new Promise((done) => {
    const probe = net.createServer();
    probe.once("error", () => done(false));
    probe.once("listening", () => probe.close(() => done(true)));
    probe.listen({ port: target, host: "0.0.0.0", exclusive: true });
  });
}

/** PID of whatever is listening on `target`, or null. */
function portOwner(target) {
  if (isWindows) {
    const output = capture("netstat", ["-ano", "-p", "TCP"]);
    for (const line of output.split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      const parts = line.trim().split(/\s+/);
      const local = parts[1] || "";
      if (!local.endsWith(`:${target}`)) continue;
      const pid = Number.parseInt(parts[parts.length - 1], 10);
      if (Number.isInteger(pid)) return pid;
    }
    return null;
  }
  const output = capture("lsof", [
    "-nP",
    `-iTCP:${target}`,
    "-sTCP:LISTEN",
    "-t",
  ]);
  const pid = Number.parseInt(output.trim().split(/\s+/)[0], 10);
  return Number.isInteger(pid) ? pid : null;
}

function describeProcess(pid) {
  const match = listProcesses().find((entry) => entry.pid === pid);
  if (match) return `pid ${pid} (${match.command})`;
  const name = isWindows
    ? capture("tasklist", ["/FI", `PID eq ${pid}`, "/NH", "/FO", "CSV"])
        .split(",")[0]
        ?.replace(/"/g, "")
        .trim()
    : capture("ps", ["-p", String(pid), "-o", "comm="]).trim();
  return name ? `pid ${pid} (${name})` : `pid ${pid}`;
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function waitForPort(target, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await portIsFree(target)) return true;
    await sleep(250);
  }
  return portIsFree(target);
}

async function reclaim() {
  const leftovers = findProjectDevServers();
  if (leftovers.length === 0) return;

  console.log(
    `[dev] Found ${leftovers.length} Next.js dev process(es) already running for this project — terminating so only one server remains:`
  );
  for (const { pid, command } of leftovers) {
    console.log(`[dev]   • pid ${pid} — ${command}`);
    killTree(pid);
  }

  const deadline = Date.now() + 10000;
  while (Date.now() < deadline && leftovers.some(({ pid }) => isAlive(pid))) {
    await sleep(200);
  }

  const survivors = leftovers.filter(({ pid }) => isAlive(pid));
  if (survivors.length > 0) {
    console.warn(
      `[dev] Could not terminate: ${survivors
        .map(({ pid }) => pid)
        .join(", ")}. Close them manually and retry.`
    );
  }
}

function usesExplicitPort(args) {
  return args.some((arg) => arg === "-p" || arg.startsWith("--port"));
}

async function resolvePortArgs() {
  if (usesExplicitPort(forwardedArgs)) return [];

  if (await waitForPort(port)) return ["--port", String(port)];

  const owner = portOwner(port);
  console.warn(
    `[dev] Port ${port} is held by ${
      owner ? describeProcess(owner) : "another process"
    }, which is not a Next.js dev server for this project.`
  );
  console.warn(`[dev] Letting Next.js pick the next free port instead.`);
  return [];
}

async function main() {
  await reclaim();
  const portArgs = await resolvePortArgs();

  const child = spawn(
    process.execPath,
    [NEXT_BIN, "dev", ...portArgs, ...forwardedArgs],
    { stdio: "inherit", cwd: projectRoot, env: process.env }
  );

  const forward = (signal) => () => {
    if (child.exitCode === null) {
      if (isWindows) killTree(child.pid);
      else child.kill(signal);
    }
  };
  process.on("SIGINT", forward("SIGINT"));
  process.on("SIGTERM", forward("SIGTERM"));
  process.on("exit", () => {
    if (child.exitCode === null && isWindows) killTree(child.pid);
  });

  child.on("exit", (code, signal) => {
    process.exit(code ?? (signal ? 1 : 0));
  });
}

main().catch((error) => {
  console.error("[dev] Failed to start the dev server:", error);
  process.exit(1);
});
