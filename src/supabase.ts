import { createClient } from "@supabase/supabase-js";

// Aquesta clau és la "publishable"/anon de Supabase — dissenyada per anar
// exposada al codi client (igual que firebase-applet-config.json). La
// protecció real no ve de amagar-la, sinó de les polítiques del bucket
// (Storage → task-attachments → Policies) configurades a la consola de
// Supabase.
const SUPABASE_URL = "https://qwdbwbsglzaxdanxrrqk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_VujXADrYFX8PFSAOkFp-mg_kWkx7NBT";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Nom del bucket de Supabase Storage on es pengen els fitxers adjunts de
// les tasques. Cal crear-lo manualment un cop des de la consola de Supabase
// (Storage → New bucket → "task-attachments", marcat com a Public) —
// l'app no el pot crear sola amb la clau publishable.
export const TASK_ATTACHMENTS_BUCKET = "task-attachments";
