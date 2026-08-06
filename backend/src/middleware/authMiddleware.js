const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'smartattend_jwt_super_secret_key_2026';

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: Requires one of [${roles.join(', ')}] access` });
    }
    next();
  };
}

// Grants full autonomous access to both Class Portals (class_portal, faculty) and Administrators
function requirePortalOrAdminAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const role = req.user.role;
  if (['super_admin', 'admin', 'class_portal', 'faculty'].includes(role)) {
    return next();
  }

  return res.status(403).json({ error: 'Forbidden: Requires Class Portal or Administrator access' });
}

// Enforces Class Portal container isolation
function checkPortalOwnership(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Super admin has global administrative override access
  if (req.user.role === 'super_admin' || req.user.role === 'admin') {
    return next();
  }

  // Class Portal check
  if (req.user.role === 'class_portal' || req.user.role === 'faculty') {
    const userPortalId = req.user.portal_id || req.user.username;
    const requestedPortalId = req.body?.portal_id || req.query?.portal_id || req.params?.portal_id;

    if (!requestedPortalId || requestedPortalId === userPortalId) {
      return next();
    }
  }

  return res.status(403).json({ error: 'Forbidden: Cannot modify another Class Portal container' });
}

module.exports = { verifyToken, requireRole, requirePortalOrAdminAccess, checkPortalOwnership, JWT_SECRET };

