import * as functions from 'firebase-functions';
const Firestore = require('@google-cloud/firestore');
import * as moment from 'moment';
import { Collections, RepeatType, Todo, Reminder } from './constants';

const firestore = new Firestore({
    projectId: 'keepmyplantalive',
});

function getNextTodo(dateRepeatType: RepeatType, lastReminder: moment.Moment): moment.Moment {
    const startDate = moment(lastReminder)
    switch(dateRepeatType) {
        case RepeatType.Daily:
            return startDate.add(1, 'd')
        case RepeatType.Weekly:
            return startDate.add(1, 'w')
        case RepeatType.Monthly:
            return startDate.add(1, 'M')
        case RepeatType.Anually:
            return startDate.add(1, 'y')
        case RepeatType.Custom:
        case RepeatType.Never:
        default:
            return moment(0)
    }
}

const KeyDivider = ':'
function calculatedPastTodos(dateLimit: moment.Moment, reminders: Array<any> ): {newTodos: Todo[], reminderUpdate: Reminder[]} {
    const newTodos: Todo[] = []
    const reminderUpdate: Reminder[] = []
    reminders.forEach((reminderDocRef: any) => {
        const { nextNotification, dateRepeatType, dateTime, users } = reminderDocRef.data();
        // the document's unique key is gardenId:plantId:id
        const ids = reminderDocRef.id.split(KeyDivider);

        const gardenId = ids[0];
        const plantId = ids[1];
        const id = ids[2];
        let nextTodoDate = moment(nextNotification);

        while (nextTodoDate.valueOf() !== 0 && nextTodoDate.isBefore(dateLimit)) {
            newTodos.push(new Todo(id, plantId, gardenId, users, nextTodoDate.valueOf()))
            nextTodoDate = getNextTodo(dateRepeatType, nextTodoDate);
        }
        reminderUpdate.push(new Reminder(id, plantId, gardenId, users, nextTodoDate.valueOf(), dateTime));
    })
    
    return { newTodos, reminderUpdate }
}

export const checkTodos = functions.https.onRequest(async (request, response) => {
    const next15Min = moment().add(15, 'minutes');

    try {
        // Get all reminders that should have a notification in the next 15 minutes
        const remindersRef = firestore.collection(Collections.REMINDERS)
                        .where("nextNotification", "<=", next15Min.valueOf());
        const remindersDocList = await remindersRef.get();
        const { newTodos, reminderUpdate } = calculatedPastTodos(next15Min, remindersDocList.docs);

        // If there's anything to update, add to database
        if (newTodos.length > 0 || reminderUpdate.length > 0) {
            const batch = firestore.batch();
            // Add all the new todos
            newTodos.forEach((todo: Todo) => {
                const id = todo.gardenId + KeyDivider + todo.plantId + KeyDivider + todo.reminderId + KeyDivider + todo.dateTime;
                const todoRef = firestore.collection(Collections.TODOS).doc(id);
                batch.set(todoRef, { ...todo });
            })
            
            // Update the next notification date for the reminders
            reminderUpdate.forEach((reminder: Reminder) => {
                const id = reminder.gardenId + KeyDivider + reminder.plantId + KeyDivider + reminder.id;
                const todoRef = firestore.collection(Collections.REMINDERS).doc(id);
                batch.update(todoRef, { nextNotification: reminder.nextNotification });
            })
            await batch.commit();
            response.send(JSON.stringify({ newTodos, reminderUpdate }));
        } else {
            response.send('Nothing to do!');
        }
    } catch (error) {
        console.error(error);
        response.send('Error ' + error);
    }

});
