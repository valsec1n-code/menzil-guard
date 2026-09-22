const DashboardUser = require('../../database/models/DashboardUser');

async function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  const user = await DashboardUser.findById(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.redirect('/login');
  }
  req.dashboardUser = user;
  next();
}

module.exports = requireAuth;
