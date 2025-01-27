import { app } from "./scriptServer";
import { getAuth } from "firebase-admin/auth";


function prompt(event: string) : Promise<string> {
  return new Promise(resolve => {
    process.stdin.on(event, (response : String) => {
      const name = response.toString().trim();
      resolve(name)
    });
  });
}

try {
  process.stdout.write('Enter the email you want to add to the admin list: ');
  const email = await prompt("data")

  if (email != null) {
    const user = await getAuth(app).getUserByEmail(email)

    if (user.emailVerified) {
        getAuth().setCustomUserClaims(user.uid, {
          admin: true,
      })
    }
  }
  
  console.log(`Successfully added ${email} as admin`)

} catch (e) {
  console.log(e);
}




