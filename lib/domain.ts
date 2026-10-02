export type FulfillmentType = "instant" | "appointment_required" | "scheduled_event";
export function fulfillmentCopy(type: FulfillmentType) { return type === "appointment_required" ? "Necesită programare" : type === "scheduled_event" ? "Eveniment programat" : "Disponibil acum"; }
export function successCopy(type: FulfillmentType) { return type === "instant" ? "Bucură-te!" : type === "scheduled_event" ? "Distracție plăcută!" : "Să-ți fie de bine!"; }
