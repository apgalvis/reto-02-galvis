export type Pais="CO"|"EC"|"PE"|"PA"|"HN"
export type Moneda="COP"|"USD"|"PEN"|"PAB"|"HNL"
export type EstadoPoliza="vigente"|"pendiente"|"vencida"|"no_aplica"
export type Clasificacion="nuevo"|"actualizacion"|"duplicado"|"rechazado"
export type ConfidenceField<T>={valor:T|null;confianza:number;fuente:string}
export type ExtractedContract={
 tipo_documento:"contrato"|"otrosi"|"otro";
 id_contrato:ConfidenceField<string>;cliente:ConfidenceField<string>;nit_cliente:ConfidenceField<string>;pais:ConfidenceField<Pais>;objeto:ConfidenceField<string>;valor:ConfidenceField<number>;valor_indeterminado:ConfidenceField<boolean>;moneda:ConfidenceField<Moneda>;fecha_inicio:ConfidenceField<string>;fecha_fin:ConfidenceField<string>;requiere_poliza:ConfidenceField<boolean>;tipo_poliza:ConfidenceField<string>;comercial:ConfidenceField<string>;
}
export type MasterRow={id_contrato:string;cliente:string;nit_cliente:string;pais:Pais;objeto:string;valor:number;moneda:Moneda;fecha_inicio:string;fecha_fin:string;requiere_poliza:boolean;tipo_poliza:string;estado_poliza:EstadoPoliza;comercial:string;ruta_sharepoint:string;fecha_registro:string;fuente:"buzon"|"manual"|"migracion"}
export type ValidationResult={clasificacion:Clasificacion;id_contrato_existente?:string;requiere_revision:string[];diferencias?:Record<string,{antes:unknown;despues:unknown}>;advertencias:string[];registro?:MasterRow}
