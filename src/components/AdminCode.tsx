import { doc, getDoc } from 'firebase/firestore';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useEffect, useRef, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import { db } from '../firebase/client';

const createConfig = (props: any) => {
  let config: any = {};
  if (props.fps) {
    config.fps = props.fps;
  }
  if (props.qrbox) {
    config.qrbox = props.qrbox;
  }
  if (props.aspectRatio) {
    config.aspectRatio = props.aspectRatio;
  }
  if (props.disableFlip !== undefined) {
    config.disableFlip = props.disableFlip;
  }
  return config;
};

const QrcodePlugin = (props: any) => {

  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null)

  const handleResume = () => {
    if (scanner) {
      scanner.resume()
    }
  }

  const handlePause = () => {
    if (scanner) {
      scanner.pause()
    }
  }

  useEffect(() => {
    // when component mounts
    const config = createConfig(props);
    const verbose = props.verbose === true;
    // Suceess callback is required.
    // if (!(props.qrCodeSuccessCallback)) {
    //     throw "qrCodeSuccessCallback is required callback.";
    // }

    const html5QrcodeScanner = new Html5QrcodeScanner("qrcodeRegionId", config, verbose);
    setScanner(html5QrcodeScanner)

    const onSuccess = async (code: string) => {
      toast.info(code)
      html5QrcodeScanner.pause()

      const formData = new FormData()
      formData.set("uid", code)
      try {
        // get email
        const response = await fetch("/api/auth/get-user-email", {
          method: "POST",
          body: formData
        })

        const msg = await response.text()
        if (!response.ok) {
          toast.error(msg)
          props.setUserInfo(null)
          return
        }

        // get data
        const email = msg
        const data = await getUserData(email)
        if (!data) {
          toast.error("No data found")
          props.setUserInfo(null)
          return
        }

        // user is not fully accepted
        if (data.appStatus !== "fullyAccepted") {
          toast.error(`${data.email}: ${data.appStatus}`)
          props.setUserInfo(null)
          return
        }

        toast.success(`${data.email}: ${data.appStatus}`)
        props.setUserInfo(data)
      }
      catch (err) {
        console.error("Something is wrong with scanner:", err)
        toast.error(`Something is wrong with scanner ${err}`)
        props.setUserInfo(null)
      }
    }

    html5QrcodeScanner.render(onSuccess, props.qrCodeErrorCallback);
    // cleanup function when component will unmount
    return () => {
      toast.warn("Attempting to clear html5QrcodeScanner")
      html5QrcodeScanner.clear().catch(error => {
        toast.error("Failed to clear html5QrcodeScanner")
        console.error("Failed to clear html5QrcodeScanner. ", error);
      }).finally(() => setScanner(null))
    };
  }, []);

  return (
    <div>
      <div id="qrcodeRegionId"></div>
      {scanner &&
        <>
          <button onClick={handleResume}>Resume Scanner</button>
          <button onClick={handlePause}>Pause Scanner</button>
        </>
      }
    </div>
  )
}

// let timeoutId: ReturnType<typeof setTimeout>;
// function debounce(cb: Function, delay: number) {
//   return (...args: any[]) => {
//     clearTimeout(timeoutId);
//     timeoutId = setTimeout(() => {
//       cb(...args);
//     }, delay);
//   };
// }

export default function AdminCode() {
  const [userInfo, setUserInfo] = useState<any | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [errMsg, setErrMsg] = useState("")

  const searchUser = async () => {
    const email = inputRef.current?.value
    if (!email) {
      toast.error("Empty email")
      setErrMsg("Empty Email")
      return
    }

    let regex = /^[a-zA-Z0-9._%+-]+@uic\.edu$/
    let regex2 = /^[a-zA-Z0-9._%+-]+@gmail\.com$/
    if (!regex.test(email) && !regex2.test(email)) {
      toast.error("Please enter full uic.edu email or gmail.com email")
      setErrMsg("Please enter full uic.edu email or gmail.com email")
      return
    }

    try {
      // get data
      const data = await getUserData(email)
      if (!data) {
        toast.error("No data found")
        setErrMsg("No data found")
        setUserInfo(null)
        return
      }

      // user is not fully accepted
      if (data.appStatus !== "fullyAccepted") {
        toast.error(`${data.email}: ${data.appStatus}`)
        setErrMsg(`${data.email}: ${data.appStatus}`)
        setUserInfo(null)
        return
      }

      toast.success(`${data.email}: ${data.appStatus}`)
      setErrMsg("")
      setUserInfo(data)
    }
    catch (err) {
      console.error("Something is wrong with scanner:", err)
      toast.error(`Something is wrong with scanner`)
      setErrMsg(`Something is wrong with scanner`)
      setUserInfo(null)
    }
  }

  async function submitFoodData() {
    if (!userInfo) {
      toast.error("No user info")
      return
    }
    const data = [...document.querySelectorAll("#form input")].reduce((acc: any, curr: any) => (acc[curr.name] = curr.checked, acc), {})
    data.email = userInfo.email
    const response = await fetch("/api/auth/update-food", {
      method: "POST",
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      toast.error("Failed to update food data")
      return
    }
    toast.success("Updated Food data!")
  }

  return (
    <div>
      <QrcodePlugin
        fps={10}
        qrbox={250}
        disableFlip={false}
        // qrCodeSuccessCallback={getUser}
        setUserInfo={setUserInfo}
      />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
        <span>Manually Search User</span>
        <div>
          <input type='text' placeholder='Enter email' ref={inputRef} style={{fontSize: "16px"}}/>
          <button onClick={searchUser}>Submit</button>
        </div>
        {!!errMsg && <span style={{color: "red", fontWeight: "bold"}}>Error: {errMsg}</span>}
      </div>
      {userInfo && <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '10px' }}>
        <span>Name: {userInfo.firstName} {userInfo.lastName}</span>
        <span>Status: {userInfo.appStatus}</span>
        <span>Email: {userInfo.email}</span>
        <span>Current Food Data</span>
        <div id='form' style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span>Day 1:</span>
            <div>
              <input name='d1Snack' id="d1Snack" type="checkbox" defaultChecked={userInfo.d1Snack} />
              <label htmlFor="d1Snack">Ate Snack?</label>
            </div>
            <div>
              <input name='d1Dinner' id="d1Dinner" type="checkbox" defaultChecked={userInfo.d1Dinner} />
              <label htmlFor="d1Dinner">Ate Dinner?</label>
            </div>
            <div>
              <input name='d1Cookies' id="d1Cookies" type="checkbox" defaultChecked={userInfo.d1Cookies} />
              <label htmlFor="d1Cookies">Ate Cookies?</label>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span>Day 2:</span>
            <div>
              <input name='d2Breakfast' id="d2Breakfast" type="checkbox" defaultChecked={userInfo.d2Breakfast} />
              <label htmlFor="d2Breakfast">Ate Breakfast?</label>
            </div>
            <div>
              <input name='d2Lunch' id="d2Lunch" type="checkbox" defaultChecked={userInfo.d2Lunch} />
              <label htmlFor="d2Lunch">Ate Lunch?</label>
            </div>
            <div>
              <input name='d2Dinner' id="d2Dinner" type="checkbox" defaultChecked={userInfo.d1Dinner} />
              <label htmlFor="d2Dinner">Ate Dinner?</label>
            </div>
          </div>
        </div>
        <span>Old Food Data</span>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span>Day 1:</span>
            <div>
              <input id="d1SnackOld" disabled type="checkbox" defaultChecked={userInfo.d1Snack} />
              <label htmlFor="d1SnackOld">Ate Snack?</label>
            </div>
            <div>
              <input id="d1DinnerOld" disabled type="checkbox" defaultChecked={userInfo.d1Dinner} />
              <label htmlFor="d1DinnerOld">Ate Dinner?</label>
            </div>
            <div>
              <input id="d1CookiesOld" disabled type="checkbox" defaultChecked={userInfo.d1Cookies} />
              <label htmlFor="d1CookiesOld">Ate Cookies?</label>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '0 0 10px 0' }}>
            <span>Day 2:</span>
            <div>
              <input id="d2BreakfastOld" disabled type="checkbox" defaultChecked={userInfo.d2Breakfast} />
              <label htmlFor="d2BreakfastOld">Ate Breakfast?</label>
            </div>
            <div>
              <input id="d2LunchOld" disabled type="checkbox" defaultChecked={userInfo.d2Lunch} />
              <label htmlFor="d2LunchOld">Ate Lunch?</label>
            </div>
            <div>
              <input id="d2DinnerOld" disabled type="checkbox" defaultChecked={userInfo.d2Dinner} />
              <label htmlFor="d2DinnerOld">Ate Dinner?</label>
            </div>
          </div>
        </div>
        <button onClick={submitFoodData} style={{ marginTop: "20px", width: "250px", height: "40px", marginBottom: "20px" }}>Submit!</button>
      </div>}
      <ToastContainer />
    </div>
  )
}

const getUserData = async (email: string) => {
  const docSnap = await getDoc(doc(db, "Forms", email))

  if (!docSnap.exists()) {
    return null
  }

  const userData = docSnap.data()

  const data = {
    email: userData.email as string,
    firstName: userData.firstName as string,
    lastName: userData.lastName as string,
    uin: userData.uin as number,
    gender: userData.gender as string,
    year: userData.year as string,
    availability: userData.availability as string,
    moreAvailability: userData.moreAvailability as string, // optional
    dietaryRestriction: userData.dietaryRestriction as string[],
    otherDietaryRestriction: userData.otherDietaryRestriction as string, // optional
    shirtSize: userData.shirtSize as string,
    teamPlan: userData.teamPlan as string,
    preWorkshops: userData.preWorkshops as string[],
    jobType: userData.jobType as string,
    otherJobType: userData.otherJobType as string, // optional
    resumeLink: userData.resumeLink as string, // optional
    appStatus: userData.appStatus as "waiting" | "declined" | "waitlist" | "accepted" | "userAccepted" | "fullyAccepted",
    createdAt: userData.createdAt as string,
    checkin1: (userData.checkin1) ? userData.checkin1 : false as boolean,
    d1Snack: (userData.d1Snack) ? userData.d1Snack : false as boolean,
    d1Dinner: (userData.d1Dinner) ? userData.d1Dinner : false as boolean,
    d1Cookies: (userData.d1Cookies) ? userData.d1Cookies : false as boolean,
    checkin2: (userData.checkin2) ? userData.checkin2 : false as boolean,
    d2Breakfast: (userData.d2Breakfast) ? userData.d2Breakfast : false as boolean,
    d2Lunch: (userData.d2Lunch) ? userData.d2Lunch : false as boolean,
    d2Dinner: (userData.d2Dinner) ? userData.d2Dinner : false as boolean
  }

  return data
}