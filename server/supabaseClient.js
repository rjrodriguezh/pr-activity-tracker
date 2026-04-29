require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Falta SUPABASE_URL en .env");
}

if (!supabaseKey) {
  throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en .env");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };