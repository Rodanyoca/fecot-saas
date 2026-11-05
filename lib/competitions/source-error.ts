// @ts-expect-error Native Node tests use explicit TypeScript extensions.
import {ActorError} from "../actors/model.ts"
// Classify only at a Google read boundary. Never serialize provider messages, URLs or credentials.
export function competitionSourceError(error:unknown,variable:string):ActorError{
 const upstream=error as {code?:unknown;response?:{status?:number;data?:{error?:{errors?:{reason?:string}[];details?:{reason?:string}[]}}}}
 const status=upstream?.response?.status,reasons=[...(upstream?.response?.data?.error?.errors||[]),...(upstream?.response?.data?.error?.details||[])].map(item=>item.reason)
 const source=["FECOT_COMPETITIONS_SPREADSHEET_ID","FECOT_REFERENTIELS_SPREADSHEET_ID"].includes(variable)?variable:"la source Google"
 if(reasons.some(r=>["SERVICE_DISABLED","accessNotConfigured"].includes(r||"")))return new ActorError("GOOGLE_API_DISABLED",`API Google Sheets indisponible pour ${source}. Vérifiez son activation dans le projet du compte applicatif.`,503)
 if(status===429||reasons.some(r=>["rateLimitExceeded","userRateLimitExceeded","quotaExceeded"].includes(r||"")))return new ActorError("GOOGLE_QUOTA",`Limite Google atteinte pour ${source}. Réessayez plus tard.`,503)
 if(status===403)return new ActorError("GOOGLE_ACCESS_DENIED",`Accès Google refusé pour ${source}. Vérifiez le classeur configuré, son partage avec le compte GOOGLE_CLIENT_EMAIL et les autorisations Google.`,503)
 if(status===404)return new ActorError("GOOGLE_SOURCE_NOT_FOUND",`Classeur inaccessible pour ${source}. Vérifiez son identifiant et son partage avec le compte applicatif.`,503)
 if(status===401)return new ActorError("GOOGLE_AUTH_FAILED",`Authentification Google impossible pour ${source}. Vérifiez la configuration du compte applicatif.`,503)
 if([408,504].includes(status||0)||["ETIMEDOUT","ECONNABORTED"].includes(String(upstream?.code)))return new ActorError("GOOGLE_SOURCE_TIMEOUT",`Délai Google dépassé pour ${source}. Réessayez après actualisation.`,503)
 return new ActorError("GOOGLE_SOURCE_UNAVAILABLE",`Source Google temporairement indisponible pour ${source}.`,503)
}
