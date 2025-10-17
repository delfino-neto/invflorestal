import { AfterViewInit, Component, ElementRef, ViewChild, OnDestroy, NgZone } from '@angular/core';
import { MessageService } from 'primeng/api';

import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import { OSM } from 'ol/source';

@Component({
  selector: 'app-trees-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  standalone: false,
})
export class MapComponent {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  

  ngAfterViewInit(){

    const layer = new TileLayer({
      source: new OSM(),
    });

    new Map({
      layers: [layer],
      target: this.mapContainer.nativeElement,
      view: new View({
        center: [0, 0],
        zoom: 1
      })
    });
  }

}