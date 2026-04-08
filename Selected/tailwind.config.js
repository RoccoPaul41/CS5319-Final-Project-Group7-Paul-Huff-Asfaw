/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {
    colors: { primary:'#4F46E5','primary-hover':'#4338CA',background:'#F9FAFB',surface:'#FFFFFF',border:'#E5E7EB','text-primary':'#111827','text-secondary':'#6B7280',muted:'#9CA3AF',success:'#10B981',warning:'#F59E0B',danger:'#EF4444','owner-bg':'#DBEAFE','owner-text':'#1D4ED8','shared-bg':'#D1FAE5','shared-text':'#065F46','editor-bg':'#FEF3C7','editor-text':'#92400E' },
    fontFamily: { sans:['Inter','sans-serif'] }, maxWidth:{ app:'1280px' }, height:{ navbar:'56px' }, width:{ sidebar:'240px' }, borderRadius:{ card:'12px',button:'8px',modal:'16px' }
  }},
  plugins: []
}
