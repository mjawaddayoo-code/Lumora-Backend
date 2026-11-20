// Strips Mongo operator keys ($...) and dotted keys from user input to block NoSQL injection.
const clean = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) delete obj[key];
    else clean(obj[key]);
  }
  return obj;
};

export default (req, _res, next) => {
  clean(req.body);
  clean(req.query);
  clean(req.params);
  next();
};
