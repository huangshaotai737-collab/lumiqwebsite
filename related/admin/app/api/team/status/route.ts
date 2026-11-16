// Both endpoints accept the complete desired membership; the same DB transaction
// validates role/status and last-admin protection. Partial updates are rejected.
export { POST } from '../role/route';
