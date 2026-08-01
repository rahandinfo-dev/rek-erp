import test from "node:test";import assert from "node:assert/strict";import {finalSalary} from "./payroll.ts";
test("approved deductions reduce final salary without changing the base",()=>{const base=1000;assert.equal(finalSalary(base,[{amount:100,approved:true},{amount:50,approved:false}]),900);assert.equal(base,1000)});
