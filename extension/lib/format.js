// MakerPeek - shared format helpers (plain global script, no ES modules).
// Loaded before content/overlay.js via manifest.json.

function formatStoreAge(oldestDate) {
  if (!oldestDate) return null;
  const now = new Date();
  const old = new Date(oldestDate);
  if (isNaN(old.getTime())) return null;

  let years = now.getFullYear() - old.getFullYear();
  let months = now.getMonth() - old.getMonth();
  if (now.getDate() < old.getDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }

  if (years === 0 && months === 0) return "Less than a month";
  if (years === 0) return `${months} month${months === 1 ? "" : "s"}`;
  if (months === 0) return `${years} year${years === 1 ? "" : "s"}`;
  return `${years} year${years === 1 ? "" : "s"} ${months} month${months === 1 ? "" : "s"}`;
}
