// "use client";
// import { useRouter } from "next/navigation";
// import { useState } from "react";

// function Icon({ type }: { type: string }) {
//   switch (type) {
//     case "mail":
//       return <svg width="20" height="20" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>;
//     case "lock":
//       return <svg width="20" height="20" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="8" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
//     case "eye":
//       return <svg width="20" height="20" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>;
//     case "eye-off":
//       return <svg width="20" height="20" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.77 21.77 0 0 1 5.06-6.06M1 1l22 22"/><path d="M9.53 9.53A3.5 3.5 0 0 0 12 15.5a3.5 3.5 0 0 0 2.47-5.97"/></svg>;
//     default:
//       return null;
//   }
// }

// export default function LoginPage() {
//   const router = useRouter();
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const [error, setError] = useState("");
//   const [success, setSuccess] = useState("");
//   const [notRobot, setNotRobot] = useState(false);
//   const [savedUser, setSavedUser] = useState<any>(null);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError("");
//     setSuccess("");
//     if (!notRobot) {
//       setError("Please confirm you are not a robot.");
//       return;
//     }
//     const res = await fetch("/api/login", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ username, password }),
//     });
//     if (res.ok) {
//       const data = await res.json();
//       setSuccess("Login successful!");
//       if (data.user) {
//         console.log('Saving user to localStorage:', data.user);
//         console.log('User role:', data.user.role);
//         console.log('Is admin?', data.user.role === "admin");
//         localStorage.setItem('user', JSON.stringify(data.user));
//         setSavedUser(data.user);
//         if (data.user.role === "admin") {
//           console.log('Redirecting admin to /admin/applications');
//           router.push("/admin/applications");
//         } else {
//           console.log('Redirecting user to /dashboard');
//           router.push("/dashboard");
//         }
//       }
//     } else {
//       let data = null;
//       const contentType = res.headers.get("content-type");
//       if (contentType && contentType.includes("application/json")) {
//         data = await res.json();
//       }
//       setError((data && data.error) || "Login failed");
//     }
//   };

//   const inputGroupStyle = {
//     display: "flex",
//     alignItems: "center",
//     background: "#f7f7f7",
//     borderRadius: 6,
//     border: "1px solid #ccc",
//     marginBottom: 16,
//     padding: 0,
//     height: 48,
//   } as const;
//   const iconBoxStyle = {
//     background: "#e9ecef",
//     borderTopLeftRadius: 6,
//     borderBottomLeftRadius: 6,
//     width: 48,
//     height: 48,
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//   } as const;
//   const inputStyle = {
//     border: "none",
//     outline: "none",
//     background: "transparent",
//     fontSize: 16,
//     padding: "0 12px",
//     flex: 1,
//     height: 48,
//     color: "#000",
//   } as const;

//   return (
//     <div
//       style={{
//         minHeight: "100vh",
//         width: "100vw",
//         backgroundImage: `url('/car-rental-app.jpg')`,
//         backgroundSize: "cover",
//         backgroundPosition: "center",
//         backgroundRepeat: "no-repeat",
//         backgroundColor: "#aaa",
//         position: "relative",
//       }}
//     >
//       <div
//         style={{
//           position: "absolute",
//           top: 0,
//           left: 0,
//           width: "100%",
//           height: "100%",
//           background: "rgba(128,128,128,0.7)",
//           zIndex: 1,
//         }}
//         />
//       <style>{`
//         @media (max-width: 600px) {
//           .login-flex-container {
//             justify-content: center !important;
//             padding-left: 0 !important;
//             padding-right: 0 !important;
//           }
//         }
//       `}</style>
//       <div
//         className="login-flex-container"
//         style={{
//           position: "relative",
//           zIndex: 2,
//           display: "flex",
//           justifyContent: "flex-end",
//           alignItems: "flex-start",
//           height: "100vh",
//           paddingLeft: "0",
//           paddingRight: "5vw",
//           paddingTop: "8vw",
//         }}
//       >
//         <div
//           style={{
//             background: "#f5f5f5",
//             borderRadius: 20,
//             boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
//             padding: "32px 16px 16px 16px",
//             width: "100%",
//             maxWidth: 400,
//             minWidth: 0,
//             display: "flex",
//             flexDirection: "column",
//             alignItems: "stretch",
//           }}
//         >
//           <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
//             <img src="/spartan_logo.png" alt="Sparta Logo" style={{ width: 48, height: 48, marginRight: 10 }} />
//             <div>
//               <div style={{ fontWeight: 700, color: "#b22222", fontSize: 22, letterSpacing: 1 }}>UNIVERSITY BIKE RENTAL</div>
//               <div style={{ fontSize: 14, color: "#444" }}>Rent. Ride. Return. Spartan-style.</div>
//             </div>
//           </div>
//           <h2 style={{ margin: "18px 0 18px 0", fontWeight: 500, color: "#222" }}>Please Log In</h2>
//           <form onSubmit={handleSubmit}>
//             <div style={inputGroupStyle}>
//               <div style={iconBoxStyle}><Icon type="mail" /></div>
//               <input
//                 type="text"
//                 placeholder="Email"
//                 value={username}
//                 onChange={e => setUsername(e.target.value)}
//                 required
//                 style={inputStyle}
//             />
//             </div>
//             <div style={inputGroupStyle}>
//               <div style={iconBoxStyle}><Icon type="lock" /></div>
//               <input
//                 type={showPassword ? "text" : "password"}
//                 placeholder="Password"
//                 value={password}
//                 onChange={e => setPassword(e.target.value)}
//                 required
//                 style={inputStyle}
//               />
//               <button
//                 type="button"
//                 onClick={() => setShowPassword(s => !s)}
//                 style={{
//                   background: "none",
//                   border: "none",
//                   cursor: "pointer",
//                   padding: "0 12px 0 0"
//                 }}
//                 tabIndex={-1}
//                 aria-label={showPassword ? "Hide password" : "Show password"}
//           >
//                 <Icon type={showPassword ? "eye-off" : "eye"} />
//               </button>
//         </div>
//             <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>* Password is case sensitive</div>
//             <div style={{
//               background: "#f7f7f7",
//               borderRadius: 6,
//               border: "1px solid #e0e0e0",
//               padding: "10px 12px",
//               marginBottom: 18,
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "space-between"
//             }}>
//               <label style={{ display: "flex", alignItems: "center", fontSize: 15 }}>
//                 <input
//                   type="checkbox"
//                   checked={notRobot}
//                   onChange={e => setNotRobot(e.target.checked)}
//                   style={{ marginRight: 8, width: 18, height: 18 }}
//           />
//                 I'm not a robot
//               </label>
//               <span style={{ fontSize: 11, color: "#888" }}>
//                 reCAPTCHA<br />
//                 <a href="#" style={{ color: "#888", textDecoration: "underline" }}>Privacy</a> - <a href="#" style={{ color: "#888", textDecoration: "underline" }}>Terms</a>
//               </span>
//             </div>
//             <button
//               type="submit"
//               style={{
//                 width: "100%",
//                 background: "#FFD600",
//                 color: "#222",
//                 fontWeight: 600,
//                 fontSize: 18,
//                 border: "none",
//                 borderRadius: 8,
//                 padding: "12px 0",
//                 marginBottom: 10,
//                 cursor: "pointer",
//                 boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
//               }}
//             >
//               Sign In
//             </button>
//             {/* Forgot password link */}
//             <div style={{ textAlign: "center", marginBottom: 8 }}>
//               <a href="/forgot-password" style={{ color: "#1976d2", textDecoration: "underline", fontWeight: 500, cursor: "pointer" }}>
//                 Forgot password?
//               </a>
//             </div>
//           </form>
//           {error && <p style={{ color: "#b22222", margin: 0, marginBottom: 8 }}>{error}</p>}
//           {success && <p style={{ color: "green", margin: 0, marginBottom: 8 }}>{success}</p>}
//           {savedUser && (
//             <div style={{ background: '#e0f7fa', color: '#1976d2', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 14 }}>
//               <b>Saved user to localStorage:</b>
//               <pre style={{ margin: 0, fontSize: 13 }}>{JSON.stringify(savedUser, null, 2)}</pre>
//             </div>
//           )}
//           <div style={{ textAlign: "center", fontSize: 15, marginTop: 8, color: "#222" }}>
//             Don't have an account?{' '}
//             <a href="/register" style={{ color: "#1976d2", textDecoration: "underline", fontWeight: 500 }}>Sign Up</a>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// } 