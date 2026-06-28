import loginHandler from "../handlers/auth/login.js"
import logoutHandler from "../handlers/auth/logout.js"
import refreshHandler from "../handlers/auth/refresh.js"
import changePasswordHandler from "../handlers/auth/change-password.js"
import updateProfileHandler from "../handlers/auth/update-profile.js"
import forgotPasswordHandler from "../handlers/auth/forgot-password.js"
import validateResetTokenHandler from "../handlers/auth/validate-reset-token.js"
import resetPasswordHandler from "../handlers/auth/reset-password.js"
import { createCatalogCrudHandler } from "../handlers/catalogs/crud.js"
import syncHandler from "../handlers/sync/sync.js"
import usersHandler from "../handlers/users/users.js"
import rolePermissionsHandler from "../handlers/roles/permissions.js"
import recordsHandler from "../handlers/records/records.js"

export const ROUTES = {
  "auth/login": {
    handler: loginHandler,
    methods: ["POST"],
  },

  "auth/logout": {
    handler: logoutHandler,
    methods: ["POST"],
  },

  "auth/refresh": {
    handler: refreshHandler,
    methods: ["POST"],
  },

  "auth/change-password": {
    handler: changePasswordHandler,
    methods: ["POST"],
  },

  "auth/profile": {
    handler: updateProfileHandler,
    methods: ["PUT"],
  },

  "auth/forgot-password": {
    handler: forgotPasswordHandler,
    methods: ["POST"],
  },

  "auth/validate-reset-token": {
    handler: validateResetTokenHandler,
    methods: ["GET"],
  },

  "auth/reset-password": {
    handler: resetPasswordHandler,
    methods: ["POST"],
  },

  sync: {
    handler: syncHandler,
    methods: ["POST"],
  },

  granjas: {
    handler: createCatalogCrudHandler("granjas"),
    methods: ["GET", "POST", "PUT", "DELETE"],
  },

  galpones: {
    handler: createCatalogCrudHandler("galpones"),
    methods: ["GET", "POST", "PUT", "DELETE"],
  },

  lotes: {
    handler: createCatalogCrudHandler("lotes"),
    methods: ["GET", "POST", "PUT", "DELETE"],
  },

  alojamientos: {
    handler: createCatalogCrudHandler("alojamientos"),
    methods: ["GET", "POST", "PUT", "DELETE"],
  },

  usuarios: {
    handler: usersHandler,
    methods: ["GET", "POST", "PUT"],
  },

  "roles/permissions": {
    handler: rolePermissionsHandler,
    methods: ["GET", "PUT"],
  },

  records: {
    handler: recordsHandler,
    methods: ["GET", "PUT", "DELETE"],
  },
}
