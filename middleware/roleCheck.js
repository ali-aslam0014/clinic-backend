const checkRole = (roles) => {
  return (req, res, next) => {
      try {
          if (!req.user) {
              return res.status(401).json({
                  success: false,
                  message: 'User not authenticated'
              });
          }

          if (!roles.includes(req.user.role)) {
              return res.status(403).json({
                  success: false,
                  message: `Access denied. ${req.user.role} is not authorized.`
              });
          }

          next();
      } catch (error) {
          console.error('Role check error:', error);
          res.status(500).json({
              success: false,
              message: 'Error in role verification'
          });
      }
  };
};

module.exports = checkRole;