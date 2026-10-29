import {hydrateRoot} from 'react-dom/client';
import App from './App';
hydrateRoot(document.getElementById('root')!,<App data={JSON.parse(document.getElementById('page-data')!.textContent!)}/>);
