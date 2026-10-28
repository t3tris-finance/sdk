/** The header carrying the `ss_…` session alongside the bearer `sk_…` key.
 * Protected methods send both: the key identifies the customer, the session
 * proves the write identity. */
export const SESSION_HEADER = "x-t3tris-session";
