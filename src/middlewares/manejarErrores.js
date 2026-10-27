// Express lo reconoce como middleware de errores por tener 4 parámetros
export function manejarErrores(error, req, res, next) {
  console.error(error);
  res.status(500).json({ error: 'Error interno del servidor' });
}
