package com.visiontour.Prueba;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class PruebaController {

    @GetMapping("/api/prueba")
    public Map<String, String> probar(){
        return Map.of(
                "mensaje","Backend funcionando"
        );
    }

}
