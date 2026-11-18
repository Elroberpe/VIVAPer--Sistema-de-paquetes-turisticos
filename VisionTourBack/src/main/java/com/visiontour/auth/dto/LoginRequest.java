package com.visiontour.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {
    public LoginRequest { if (email != null) email = email.strip(); }
    @Override public String toString() { return "LoginRequest[datos protegidos]"; }
}
