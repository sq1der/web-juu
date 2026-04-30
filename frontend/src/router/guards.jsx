// guards.jsx
export function PrivateRoute({ children }) {
  return children; // Просто возвращаем страницу без проверок
}

export function RoleRoute({ children, role }) {
  return children; // Игнорируем роль
}

export function GuestRoute({ children }) {
  return children; // Пускаем везде
}