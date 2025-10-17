import { NgModule } from "@angular/core";
import { MapComponent } from "./components/map/map.component";
import { MessageService } from "primeng/api";
import {ToastModule} from 'primeng/toast'
@NgModule({
    declarations: [MapComponent],
    imports: [ToastModule],
    providers: [
    MessageService],
    exports: [MapComponent]
})
export class SharedModule {}