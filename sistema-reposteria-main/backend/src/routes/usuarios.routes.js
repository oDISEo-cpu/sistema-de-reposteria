const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Ruta para registrar un nuevo usuario en la repostería
router.post('/registro', async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    // Cifrar la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Guardar en la base de datos
    const nuevoUsuario = await pool.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol',
      [nombre, email, hashedPassword, rol || 'empleado']
    );

    res.status(201).json({
      mensaje: 'Usuario registrado con éxito',
      usuario: nuevoUsuario.rows[0]
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Error en el servidor al registrar el usuario' });
  }
});

// Ruta para iniciar sesión (Login)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar el usuario por email
    const usuario = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (usuario.rows.length === 0) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    // Verificar la contraseña cifrada
    const contraseñaValida = await bcrypt.compare(password, usuario.rows[0].password);
    if (!contraseñaValida) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    // Generar el token JWT válido por 24 horas
    const token = jwt.sign(
      { id: usuario.rows[0].id, rol: usuario.rows[0].rol },
      process.env.JWT_SECRET || 'secreto_temporal',
      { expiresIn: '24h' }
    );

    res.json({
      mensaje: '¡Inicio de sesión exitoso!',
      token,
      usuario: {
        id: usuario.rows[0].id,
        nombre: usuario.rows[0].nombre,
        email: usuario.rows[0].email,
        rol: usuario.rows[0].rol
      }
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Error en el servidor al iniciar sesión' });
  }
});

module.exports = router;
