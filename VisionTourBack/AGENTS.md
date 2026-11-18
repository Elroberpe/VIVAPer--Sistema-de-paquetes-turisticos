\# VIVAAIR — Reglas de desarrollo Backend



\## 1. Contexto del proyecto



VIVAAIR es un sistema web de reservas de paquetes turísticos.



Tecnologías:

\- Java

\- Spring Boot

\- Spring Security

\- Spring Data JPA / Hibernate

\- MySQL

\- Maven



\*\*Regla principal:\*\* respetar siempre la arquitectura, estructura y convenciones existentes del backend.



\## 2. Arquitectura



El backend debe mantener una arquitectura por capas, respetando la organización de paquetes definida en el proyecto.



Responsabilidades:



\- \*\*Controller:\*\* recibir solicitudes HTTP, validar entradas y devolver respuestas.

\- \*\*Service:\*\* implementar las reglas de negocio.

\- \*\*Repository:\*\* realizar operaciones de persistencia.

\- \*\*Entity:\*\* representar el modelo de persistencia.

\- \*\*DTO:\*\* definir los datos de entrada y salida de la API.

\- \*\*Mapper:\*\* convertir entre entidades y DTO.

\- \*\*Security:\*\* gestionar autenticación y autorización.

\- \*\*Exception:\*\* centralizar el manejo de errores.



Reglas obligatorias:



1\. No colocar lógica de negocio en los controladores.

2\. No acceder directamente a los repositorios desde los controladores.

3\. No devolver entidades JPA directamente.

4\. Utilizar inyección de dependencias por constructor.

5\. Respetar la estructura de paquetes existente.

6\. Evitar clases y abstracciones innecesarias.



\## 3. Convenciones de código



\- Clases e interfaces: `PascalCase`.

\- Métodos y variables: `camelCase`.

\- Constantes: `UPPER\_SNAKE\_CASE`.

\- Paquetes: minúsculas.

\- Utilizar nombres descriptivos y consistentes.

\- Mantener métodos pequeños y con una responsabilidad clara.

\- Evitar duplicación de código.

\- No utilizar imports innecesarios.

\- Evitar `System.out.println`; utilizar un sistema de logging.

\- No introducir Lombok u otras librerías sin verificar si el proyecto las utiliza.



\## 4. Controladores REST



1\. Utilizar las anotaciones REST de Spring Boot.

2\. Mantener rutas consistentes bajo `/api`.

3\. Utilizar correctamente los métodos HTTP.

4\. Devolver códigos HTTP adecuados.

5\. Validar los DTO de entrada mediante `@Valid`.

6\. No implementar lógica de negocio en los controladores.

7\. No exponer información interna ni errores técnicos al cliente.



Convenciones HTTP:



\- `GET`: consultar recursos.

\- `POST`: crear recursos.

\- `PUT`: actualizar recursos completos.

\- `PATCH`: actualizar recursos parcialmente.

\- `DELETE`: eliminar recursos.



\## 5. Servicios



1\. Centralizar las reglas de negocio en la capa Service.

2\. Validar las condiciones de negocio antes de realizar operaciones.

3\. Utilizar `@Transactional` cuando corresponda.

4\. Evitar duplicar lógica entre servicios.

5\. No utilizar excepciones genéricas cuando existan excepciones específicas.

6\. No realizar consultas innecesarias a la base de datos.



\## 6. Persistencia y base de datos



1\. Utilizar Spring Data JPA para la persistencia.

2\. Mantener las relaciones entre entidades correctamente definidas.

3\. Evitar consultas N+1.

4\. Aplicar paginación en listados que puedan crecer.

5\. No utilizar `FetchType.EAGER` indiscriminadamente.

6\. No modificar tablas o columnas sin revisar el modelo de datos.

7\. Utilizar migraciones versionadas si el proyecto tiene configurada una herramienta de migración.

8\. No eliminar información mediante operaciones en cascada sin una regla de negocio que lo justifique.

9\. No modificar directamente la base de datos de producción.



\## 7. DTO y validaciones



1\. Utilizar DTO para solicitudes y respuestas.

2\. No exponer información sensible.

3\. Utilizar Bean Validation.

4\. No confiar en las validaciones del frontend.

5\. Mantener consistencia en los nombres de atributos enviados al cliente.

6\. No introducir atributos no definidos en los contratos API.



Anotaciones frecuentes:



\- `@NotNull`

\- `@NotBlank`

\- `@Size`

\- `@Email`

\- `@Positive`

\- `@Valid`



\## 8. Seguridad



1\. Utilizar Spring Security.

2\. Almacenar contraseñas mediante un algoritmo seguro como BCrypt.

3\. Nunca guardar contraseñas en texto plano.

4\. Aplicar autorización según los roles y permisos definidos.

5\. Proteger los endpoints privados.

6\. No incluir secretos, credenciales o claves en el repositorio.

7\. Validar los tokens de autenticación cuando se utilicen.

8\. No confiar en el rol enviado por el cliente.

9\. Aplicar el principio de mínimo privilegio.

10\. Configurar CORS según los orígenes autorizados.

11\. No desactivar mecanismos de seguridad sin justificación técnica.

12\. Evitar registrar contraseñas, tokens y datos sensibles.



\## 9. Manejo de excepciones



1\. Centralizar los errores mediante `@RestControllerAdvice`.

2\. Devolver respuestas de error consistentes.

3\. Utilizar códigos HTTP apropiados.

4\. No mostrar stack traces al cliente.

5\. Registrar los errores importantes para facilitar el diagnóstico.

6\. Diferenciar errores de validación, negocio, autenticación y servidor.



\## 10. Pruebas



1\. Crear pruebas unitarias para las reglas de negocio importantes.

2\. Utilizar JUnit y Mockito cuando corresponda.

3\. Probar los casos exitosos y los casos de error.

4\. Verificar permisos y acceso a endpoints protegidos.

5\. No afirmar que una funcionalidad está probada sin ejecutar las pruebas.

6\. No eliminar pruebas existentes para hacer pasar una implementación.



\## 11. Reglas al trabajar con IA



Antes de escribir código:



1\. Revisar los archivos relacionados con la tarea.

2\. Comprender la implementación existente.

3\. Identificar los archivos que será necesario crear o modificar.

4\. Respetar la arquitectura y contratos establecidos.



Durante la implementación:



1\. Modificar únicamente los archivos necesarios.

2\. No cambiar nombres existentes sin autorización.

3\. No agregar dependencias innecesarias.

4\. No crear funcionalidades adicionales.

5\. Reutilizar componentes existentes.

6\. Evitar soluciones excesivamente complejas.

7\. No realizar cambios destructivos sin autorización.



Después de implementar:



1\. Revisar el código generado.

2\. Ejecutar compilación y pruebas cuando sea posible.

3\. Informar los archivos creados y modificados.

4\. Explicar brevemente los cambios.

5\. Reportar errores, limitaciones o pruebas pendientes.



\## 12. Restricciones importantes



La IA NO debe:



\- Cambiar la arquitectura sin autorización.

\- Inventar entidades o atributos.

\- Modificar contratos API existentes sin aprobación.

\- Agregar nuevas dependencias sin justificar su necesidad.

\- Modificar módulos ajenos a la tarea.

\- Eliminar código funcional sin comprender sus dependencias.

\- Exponer información sensible.

\- Omitir validaciones de seguridad.

\- Implementar funcionalidades que no fueron solicitadas.



\## 13. Principio final



\*\*Priorizar simplicidad, seguridad, consistencia y mantenibilidad.\*\*



Toda implementación debe integrarse con la arquitectura existente de VIVAAIR y resolver únicamente el requerimiento solicitado.

### Gestión del esquema de base de datos

1. Flyway será el único responsable de crear y modificar el esquema de MySQL.
2. Las restricciones `UNIQUE`, los índices y las claves foráneas deben definirse en las migraciones SQL.
3. Las entidades JPA deben contener únicamente las anotaciones necesarias para mapear tablas, columnas y relaciones.
4. Evitar `@UniqueConstraint` e `@Index` en las entidades, porque estas definiciones estarán gestionadas por Flyway.
5. Mantener `@Column`, `@JoinColumn`, `@ManyToOne` y demás anotaciones necesarias para el mapeo JPA.
6. Configurar Hibernate con `ddl-auto: validate`.
7. No utilizar `ddl-auto: create`, `create-drop` ni `update`.
8. No modificar migraciones ya ejecutadas en entornos compartidos. Crear nuevas migraciones para los cambios posteriores.
9. Mantener sincronizados el modelo JPA y las migraciones SQL.
