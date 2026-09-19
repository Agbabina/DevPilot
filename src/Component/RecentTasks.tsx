import {useEffect, useState} from 'react';
import {projectService, type Task} from "../services/projectService";

export default function RecentTasks(){
    const [tasks, setTasks]= useState<Task[]>([]);
    useEffect(()=>{
        projectService.getTasksAddedToday().then(setTasks);
    }, []);

    return (
        <section className="rounded-3xl bg-white p-6 showdow-sm dark:bg.slate-900">
            <h2 className="text-lg font-bold">Tasks added today</h2>
            {tasks.length===0 ?( <p className="mt-3 text-sm text-slate-500">
                No tasks added today
            </p>): (<div className="mt-4 space-y-3">
                {tasks.map((task)=>(<div key={task.id} className="rounded-xl bg-slate-100 p-3">
                    <p className="font-semibold">{task.title}</p>
                    <p className="text-xs text-slate-500">{task.priority}</p>
                </div>))}
            </div>)}
        </section>
    )
}