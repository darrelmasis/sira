export function serializeUser(user) {
  return {
    id: String(user._id || user.id),
    username: user.username,
    nombre: user.nombre,
    email: user.email,
    role: user.role,
    active: user.active,
    granjasAsignadas: (user.granjasAsignadas || []).map((id) => String(id)),
    avatarId: user.avatarId || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
