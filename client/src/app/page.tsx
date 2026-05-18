"use client";
import Style from "./page.module.css";
import Visualizer from "@/components/visualizer/_visualizer";
import { useState, useEffect } from "react";

export default function Home() {

  const [latestPacket, setLatestPacket] = useState<string>("");

  useEffect(()=>{
    const socket = new WebSocket("ws://localhost:3000");

    socket.onopen = (e) => {
      console.log('Connected to packet stream.')
    }

    socket.onmessage = (e) => {
      const packet = JSON.parse(e.data);
      const packetString = JSON.stringify(packet, null, 2);
      setLatestPacket(packetString);
      console.log("New Packet: ", packet);
    }

    socket.onclose = (e) => {
      console.log("Connection closed. Stream has ended.");
    }

    socket.onerror = (e) => {
      console.error('Websocket Error:', e);
    }

    return () => {
      socket.close();
    }
  }, []);

  return(
    <main className={Style.main}>
      <div className={Style.visBox}>
        <Visualizer latestPacket={latestPacket}/>
      </div>
      <div>
        <p>CHARTS HERE</p>
      </div>
      <div>
        <p>hello</p>
        <p>{latestPacket}</p>
      </div>
    </main>
  )
}