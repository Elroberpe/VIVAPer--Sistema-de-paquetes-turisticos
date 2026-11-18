package com.visiontour.usuario.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum RolNombre {
    ADMIN,
    EMPLEADO,
    CLIENTE;

    // Los roles del JSON se reciben por nombre, nunca por su posición numérica.
    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static RolNombre desdeJson(String nombre) {
        return RolNombre.valueOf(nombre);
    }
}
