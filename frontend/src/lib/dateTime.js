/** Backend LocalDateTime values carry UTC even when their ISO text has no Z. */
export function parseApiDateTime(value) {
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value || '') ? value : `${value}Z`);
}

/** Show local scheduling controls; send explicitly UTC instants to the API. */
export function toLocalDateTime(value) {
  const date = parseApiDateTime(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export function toUtcDateTime(value) {
  return new Date(value).toISOString().slice(0, 19);
}
