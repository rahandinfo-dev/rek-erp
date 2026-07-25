import InlineScript from "@/components/ui/InlineScript";

/**
 * Applies the stored theme before paint (avoids flash).
 * Preference lives in localStorage so it survives logout/refresh/login/browser restart.
 */
const CODE = `(function(){try{var k='rek-theme';var t=localStorage.getItem(k);var dark=t==='dark';var r=document.documentElement;r.classList.toggle('dark',dark);r.dataset.theme=dark?'dark':'light';r.style.colorScheme=dark?'dark':'light';if(t!=='light'&&t!=='dark'){localStorage.setItem(k,'light');}}catch(e){}})();`;

export default function ThemeScript() {
  return <InlineScript html={CODE} />;
}
