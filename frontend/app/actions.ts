'use server'

export async function verifyAdmin(username: string, password: string): Promise<boolean> {
  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;

  // basic check
  if (adminUser && adminPass && username === adminUser && password === adminPass) {
    return true;
  }
  return false;
}
