import React from "react";

export default function MushafPlayButton({ ac="currentColor", playing=false, size=56 }) {
  return (
    <svg width={size} height={size} viewBox="-30 -30 60 60" style={{
      color: ac,
      overflow:"visible",
      animation: playing ? "mushafSpin 18s linear infinite" : "none"
    }}>
      <style>{`
      @keyframes mushafSpin{
        from{transform:rotate(0deg)}
        to{transform:rotate(360deg)}
      }
      `}</style>

      {[...Array(24)].map((_,i)=>{
        const a=i*15*Math.PI/180;
        return <circle key={i} cx={Math.cos(a)*24} cy={Math.sin(a)*24} r=".7" fill="currentColor" opacity=".35"/>;
      })}

      {[...Array(16)].map((_,i)=>{
        const a=i*22.5;
        const r=18;
        const x=Math.cos(a*Math.PI/180)*r;
        const y=Math.sin(a*Math.PI/180)*r;
        return <ellipse key={"l"+i} cx={x} cy={y} rx="4.2" ry="1.6"
          transform={`rotate(${a} ${x} ${y})`}
          fill="currentColor" opacity=".75"/>;
      })}

      {[...Array(16)].map((_,i)=>{
        const a=i*22.5+11.25;
        const r=11;
        const x=Math.cos(a*Math.PI/180)*r;
        const y=Math.sin(a*Math.PI/180)*r;
        return <ellipse key={"s"+i} cx={x} cy={y} rx="2.1" ry=".9"
          transform={`rotate(${a} ${x} ${y})`}
          fill="currentColor" opacity=".9"/>;
      })}

      {[0,45,90,135,180,225,270,315].map((d,i)=>(
        <g key={i} transform={`rotate(${d})`}>
          <path d="M22 0 L26 -2 L29 0 L26 2 Z" fill="currentColor"/>
          <circle cx="30.2" cy="0" r=".8" fill="currentColor" opacity=".55"/>
        </g>
      ))}

      <circle r="13" fill="none" stroke="currentColor" strokeWidth=".8"/>
      <circle r="9.5" fill="none" stroke="currentColor" strokeWidth=".5" opacity=".6"/>

      {[...Array(16)].map((_,i)=>{
        const a=i*22.5*Math.PI/180;
        return <circle key={"p"+i} cx={Math.cos(a)*11.2} cy={Math.sin(a)*11.2} r=".35" fill="currentColor" opacity=".6"/>;
      })}

      {playing ? <>
        <rect x="-3.3" y="-5.2" width="2.2" height="10.4" rx=".5" fill="currentColor"/>
        <rect x="1.1" y="-5.2" width="2.2" height="10.4" rx=".5" fill="currentColor"/>
      </> :
      <polygon points="-3.2,-6 6.2,0 -3.2,6" fill="currentColor"/>}
    </svg>
  );
}
