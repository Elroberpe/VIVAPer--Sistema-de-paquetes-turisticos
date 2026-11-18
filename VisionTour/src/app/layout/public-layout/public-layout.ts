import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';
import { SkipLink } from '../../shared/ui/skip-link';

@Component({ selector: 'vp-public-layout', imports: [RouterOutlet, Header, Footer, SkipLink], template: `<vp-skip-link /><vp-header /><main id="contenido" tabindex="-1"><router-outlet /></main><vp-footer />` })
export class PublicLayout {}
