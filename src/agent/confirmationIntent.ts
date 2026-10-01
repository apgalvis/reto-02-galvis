export function isExplicitConfirmation(s:string){return /^(confirmo|sí confirmo|si confirmo|confirmado|apruebo)(\b|$)/i.test(s.trim())}
export function isExplicitRejection(s:string){return /^(no confirmo|no continuar|rechazo|cancelar)(\b|$)/i.test(s.trim())}
