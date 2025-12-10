

const logger = (req, res, next) => {
  const timestamp = new Date().toLocaleString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  
 
  if (Object.keys(req.query).length > 0) {
    console.log('Query params:', req.query);
  }
  
  
  if (Object.keys(req.params).length > 0) {
    console.log('URL params:', req.params);
  }
  
  next();
};

module.exports = logger;