import { createContext,useContext,useMemo,useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout as apiLogout } from '../services/api'
const AuthContext=createContext(null)
export function AuthProvider({children}){const [token,setToken]=useState(localStorage.getItem('cn_token')); const [user,setUser]=useState(JSON.parse(localStorage.getItem('cn_user')||'null')); const navigate=useNavigate(); const login=(t,u)=>{localStorage.setItem('cn_token',t);localStorage.setItem('cn_user',JSON.stringify(u));setToken(t);setUser(u)}; const logout=async()=>{try{await apiLogout()}catch{} localStorage.removeItem('cn_token');localStorage.removeItem('cn_user');setToken(null);setUser(null);navigate('/login')}; const value=useMemo(()=>({user,token,login,logout}),[user,token]); return <AuthContext.Provider value={value}>{children}</AuthContext.Provider> }
export const useAuth=()=>useContext(AuthContext)
