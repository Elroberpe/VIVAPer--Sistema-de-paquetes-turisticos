INSERT INTO roles (nombre)
VALUES ('ADMIN'), ('EMPLEADO'), ('CLIENTE')
ON DUPLICATE KEY UPDATE nombre = nombre;
