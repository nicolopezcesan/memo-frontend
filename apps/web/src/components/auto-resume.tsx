import { useAutoResume } from '../hooks/use-auto-resume.js';

/** Must be rendered inside <BrowserRouter>, as a sibling of <Routes>. */
export function AutoResume() {
  useAutoResume();
  return null;
}
