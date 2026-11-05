import type {Entity} from "./model"
export type Field={key:string;label:string;type?:"select"|"search"|"date"|"time"|"number"|"textarea";options?:string;required?:boolean;locked?:boolean;optionalColumn?:boolean}
const f=(key:string,label:string,extra:Omit<Field,"key"|"label">={}):Field=>({key,label,...extra})
const select=(key:string,label:string,options:string,required=true,locked=false)=>f(key,label,{type:"select",options,required,locked})
const date=(key:string,label:string,required=true)=>f(key,label,{type:"date",required})
const observations=f("observations","Observations",{type:"textarea"})
const status=select("statut","Statut","administrative")
const event=select("id_epreuve_competition","Épreuve","epreuves")
const phase=select("id_phase_competition","Phase","phases")
const group=select("id_groupe","Groupe","groupes",false)
const unit=(key="id_unite_competition",label="Unité sportive",required=true)=>select(key,label,"unites",required)
const typeActor=select("id_type_acteur","Type d’acteur","TYPES_ACTEURS")
const actor=f("id_acteur","Acteur",{type:"search",options:"actors",required:true})
const result=[select("id_type_resultat","Type de résultat","TYPES_RESULTATS"),select("id_statut_resultat","Statut du résultat","STATUTS_RESULTATS"),select("id_decision_resultat","Décision officielle","DECISIONS_RESULTATS",false)]
export const fields:Record<Entity,Field[]>={
 competition:[f("nom_competition","Nom de la compétition",{required:true}),f("numero_edition","Numéro d’édition"),select("id_type_competition","Type de compétition","TYPES_COMPETITIONS"),select("id_discipline","Discipline","DISCIPLINES"),select("id_saison","Saison","SAISON"),date("date_debut","Début"),date("date_fin","Fin"),f("pays","Pays",{required:true}),f("lieu","Lieu"),select("statut","Statut","competitionStatuses"),observations],
 epreuve:[f("nom_epreuve","Nom de l’épreuve",{required:true}),select("id_discipline","Discipline","DISCIPLINES"),select("id_categorie_age","Catégorie d’âge","CATEGORIES_AGE"),select("id_sexe","Sexe","SEXES"),select("id_categorie_competition","Catégorie sportive / poids","CATEGORIES_COMPETITION",false),{...select("format_resultat","Format du résultat","resultFormats",false),optionalColumn:true},status,observations],
 engagement:[event,select("id_type_unite_competition","Type d’unité","TYPES_UNITES_COMPETITION"),f("id_club","Club",{type:"search",options:"clubs",required:true}),f("id_athlete","Athlète",{type:"search",options:"athletes"}),phase,group,select("id_type_affectation_phase","Type d’affectation initiale","TYPES_AFFECTATIONS_PHASES"),date("date_inscription","Inscription"),select("statut_participation","Statut de l’engagement","participationStatuses"),observations],
 unite:[],
 groupeUnite:[],
 phase:[event,select("id_type_phase","Type de phase","TYPES_PHASES"),select("id_mode_phase","Mode de phase","MODES_PHASES"),f("numero_phase","Ordre de phase",{type:"number",required:true}),f("nom_phase","Nom de la phase",{required:true}),status,observations],
 groupe:[phase,f("nom_groupe","Nom du groupe",{required:true}),status,observations],
 affectation:[phase,group,unit(),select("id_type_affectation_phase","Type d’affectation","TYPES_AFFECTATIONS_PHASES"),select("id_phase_source","Phase source","phases",false),select("id_match_source","Combat source","combats",false),date("date_affectation","Affectation"),status,observations],
 combat:[phase,group,unit("id_unite_a","Unité A"),unit("id_unite_b","Unité B"),date("date_match","Date du combat"),f("heure_match","Heure du combat",{type:"time"}),select("statut_match","Statut du combat","matchStatuses"),observations],
 resultat:[select("id_match","Combat","combats",true,true),...result,f("score_a","Manches gagnées A",{type:"number"}),f("score_b","Manches gagnées B",{type:"number"}),unit("id_unite_vainqueur","Vainqueur officiel",false),observations],
 classement:[phase,group,unit(),f("rang","Rang officiel",{type:"number",required:true}),observations],
 intervenant:[typeActor,actor,unit("id_unite_competition","Unité associée",false),select("id_fonction","Fonction","FONCTIONS",false),f("role_participant","Rôle dans la compétition",{required:true}),status,observations],
 distinction:[event,select("id_type_distinction","Type de distinction","TYPES_DISTINCTIONS"),unit("id_unite_competition","Unité récompensée",false),{...typeActor,required:false},{...actor,required:false},select("id_phase_competition","Phase","phases",false),select("id_match","Combat","combats",false),date("date_attribution","Attribution"),status,observations],
 prestation:[event,phase,unit(),f("ordre_passage","Ordre de passage",{type:"number",required:true}),date("date_prestation","Date de la prestation"),f("heure_prestation","Heure de la prestation",{type:"time"}),status,observations],
 resultatPrestation:[select("id_prestation","Prestation","prestations",true,true),...result,f("note_officielle","Note officielle",{type:"number"}),f("rang_officiel","Rang officiel",{type:"number"}),observations],
}
export const administrativeStatuses=["ACTIF","INACTIF"]
export const competitionStatuses=["PLANIFIEE","EN_COURS","TERMINEE","ANNULEE"]
// Administrative states, not a sporting scoring or qualification policy.
export const participationStatuses=["INSCRIT","PARTICIPANT","ABSENT","FORFAIT","RETIRE","ANNULE"]
export const matchStatuses=["PLANIFIE","EN_COURS","TERMINE","ANNULE"]
export const resultFormats=[{id:"WT_KYORUGI_BEST_OF_THREE",label:"WT kyorugi — meilleur de trois manches"},{id:"WT_POOMSAE_RECONNU",label:"WT poomsae reconnu — note officielle"},{id:"WT_POOMSAE_LIBRE",label:"WT poomsae libre — note officielle"}]
export const defaults:Partial<Record<Entity,Record<string,string>>>={competition:{statut:"PLANIFIEE"},engagement:{statut_participation:"INSCRIT"},combat:{statut_match:"PLANIFIE"}}
