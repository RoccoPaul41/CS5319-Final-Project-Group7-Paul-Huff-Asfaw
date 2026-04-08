import { createContext,useContext,useMemo,useState } from 'react'
const ToastContext=createContext(null)
export function ToastProvider({children}){const [items,setItems]=useState([]); const push=(type,message)=>{const id=Date.now()+Math.random(); setItems((p)=>[...p,{id,type,message}]); setTimeout(()=>setItems((p)=>p.filter((x)=>x.id!==id)),3000)}; const toast=useMemo(()=>({success:(m)=>push('success',m),error:(m)=>push('error',m),info:(m)=>push('info',m)}),[]); return <ToastContext.Provider value={{items,toast}}>{children}</ToastContext.Provider>}
export const useToast=()=>useContext(ToastContext)
