export const Collections = {
    USERS: "USERS",
    PLANTS: "PLANTS",
    REMINDERS: "REMINDERS",
    TODOS: "TODOS",
    GARDENS: "GARDENS"
}

export enum RepeatType {
    Never = 'Never',
    Daily = 'Daily',
    Weekly = 'Weekly',
    Monthly = 'Monthly',
    Anually = 'Anually',
    Custom = 'Custom',
}

export class Reminder {
    constructor(public id: number, 
        public plantId: string, 
        public gardenId: string, 
        public users: string[],
        public nextNotification: number,
        public dateTime: number,
        ) {}
}

export class Todo {
    constructor( public reminderId: number,
        public plantId: string,
        public gardenId: string,
        public users: string[],
        public dateTime: number,
        public done: boolean = false,
        ) {}
}