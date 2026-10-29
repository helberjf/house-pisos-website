import {createApp} from './app';
const app=await createApp(process.argv.includes('--production'));app.listen(Number(process.env.PORT)||4173,'0.0.0.0',()=>console.log('House disponível em http://localhost:'+(process.env.PORT||4173)));
