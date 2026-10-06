export function Arrow() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
export function Flower() {
  return <svg aria-hidden="true" viewBox="0 0 80 80" fill="none"><g stroke="currentColor" strokeWidth="1"><ellipse cx="40" cy="40" rx="11" ry="31" /><ellipse cx="40" cy="40" rx="11" ry="31" transform="rotate(45 40 40)" /><ellipse cx="40" cy="40" rx="11" ry="31" transform="rotate(90 40 40)" /><ellipse cx="40" cy="40" rx="11" ry="31" transform="rotate(135 40 40)" /><circle cx="40" cy="40" r="7" /></g></svg>;
}
export function Brand() {
  return <a className="brand" href="/" aria-label="Make My Marriage home"><Flower /><span>Make My Marriage<small>A LITTLE MORE TOGETHER</small></span></a>;
}
