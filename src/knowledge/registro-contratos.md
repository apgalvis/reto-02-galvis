# Registro de contratos — conocimiento operativo

- El maestro original está congelado al 2026-05-30 y es solo lectura.
- Nuevos registros escriben en `out/sharepoint/maestro-contratos.csv`.
- Duplicado: mismo ID y mismos valor, fecha de inicio y fecha fin.
- Actualización: mismo ID, mismo NIT+objeto con similitud >= 0.9 y cambios, o documento identificado como otrosí.
- Campos con confianza < 0.8 requieren revisión humana.
- Nuevo contrato con póliza inicia `estado_poliza=pendiente`; sin póliza usa `no_aplica`.
- Alertas: vencimientos <=60 días, pólizas requeridas no vigentes, y registros desde 2026-05-30.
