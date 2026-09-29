import { getChatGPTUser } from "./chatgpt-auth";
import Dayflow from "./dayflow";
export const dynamic = "force-dynamic";
export default async function Home() {
  const user = await getChatGPTUser();
  return (
    <Dayflow
      user={
        user
          ? {
              name: user.fullName || user.email.split("@")[0],
              email: user.email,
            }
          : null
      }
    />
  );
}
