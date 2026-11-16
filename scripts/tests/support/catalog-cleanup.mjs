/** Every cleanup branch runs even when setup created only some users or SQL cleanup fails. */
export async function cleanupCatalog({users, deleteOrders, restore, deleteUser}) {
  const errors=[];
  try { if (users.member) await deleteOrders(users.member.id); } catch(error) {errors.push(error);}
  try { await restore(); } catch(error) {errors.push(error);}
  for (const user of Object.values(users)) {try {await deleteUser(user.id);} catch(error) {errors.push(error);}}
  if (errors.length) throw new AggregateError(errors,'Catalog fixture cleanup failed');
}
