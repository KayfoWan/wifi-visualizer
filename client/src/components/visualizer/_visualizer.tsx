"use client";
import { useEffect, useState, useRef } from "react";
import Style from "./visualizer.module.css";
import * as THREE from "three";

interface NetworkPacket {
    size: string;
    macSrc: string;
    macDst: string;
    src: string;
    dst: string;
    proto: string;
}

export default function Visualizer({latestPacket}:{latestPacket:string}) {

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [packetHistory, setPacketHistory] = useState<NetworkPacket[]>([]);
    const historyRef = useRef<NetworkPacket[]>([]);

    useEffect(()=>{
        if(!latestPacket) return;

        try {
            const newPacket: NetworkPacket = JSON.parse(latestPacket);

            setPacketHistory(prev=>{
                const updated = [...prev, newPacket];
                historyRef.current = updated;
                return updated;
            });
        } catch (error) {
            console.error("Failed to parse incoming packet string:", error);
        }
    }, [latestPacket]);

    useEffect(()=>{
        if(!canvasRef.current) return;
        const canvas = canvasRef.current;
        if(canvas) {
            const cWidth = canvas.width = canvas.clientWidth;
            const cHeight = canvas.height = canvas.clientHeight;
            
            const renderer = new THREE.WebGLRenderer({
                canvas: canvasRef.current,
                antialias: true,
                alpha: true
            });

            renderer.setSize(cWidth, cHeight, false);
            renderer.setAnimationLoop(animate);

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, cWidth / cHeight, 0.1, 1000);
            camera.position.z = 5;
            camera.position.y = 2;
            camera.lookAt(0,0,0);

            const box = new THREE.Mesh(
                new THREE.BoxGeometry(1, 5, 1),
                new THREE.MeshStandardMaterial({
                    color: "black"
                })
            );
            scene.add(box);

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
            scene.add(ambientLight);

            function animate() {
                box.rotation.y += .05;
                scene.rotation.x += .05;

                const totalPackets = historyRef.current.length;
                if(totalPackets > 0) {
                    const lastPacket = historyRef.current[totalPackets - 1];
                    const parsedSize = parseInt(lastPacket.size);
                    const targetScale = Math.min(parsedSize / 300, 5);

                    box.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
                }

                renderer.render(scene, camera);
            };

            return () => {
                renderer.setAnimationLoop(null);
                renderer.dispose();
            };
        }
    }, []);

    return(
        <>
        <canvas ref={canvasRef} className={Style.canvas}></canvas>
        {
            [...packetHistory].reverse().slice(0, 10).map((p, i) => (
                <div key={i}>
                    <p>size: {p.size}</p>
                    <p>proto: {p.proto}</p>
                    <p>src: {p.src}</p>
                    <p>dst: {p.dst}</p>
                    <p>macSrc: {p.macSrc}</p>
                    <p>macDst: {p.macDst}</p>
                </div>
            ))
        }
        </>
    )
}