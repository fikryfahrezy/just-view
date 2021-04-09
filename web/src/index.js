import Thumbnail from './thumbnail.png';
import config from './config.json';
import 'lazysizes';
import 'lazysizes/plugins/blur-up/ls.blur-up';
import 'lazysizes/plugins/object-fit/ls.object-fit';
import 'lazysizes/plugins/parent-fit/ls.parent-fit';
import './styles.css';

const serverUrl = config.serverUrl || '...';
const grid = document.querySelector('.grid');
const scrollButton = document.querySelector('.scroll-button');
const loadMore = document.getElementById('load-more');
const thumbnail = document.querySelector('.thumbnail');
let observer = null;
let iso = null;
let isFetching = false;
let viewsCount = 0;
let loadedViews = 0;

const thumbnailImg = new Image();
thumbnailImg.src = Thumbnail;
thumbnailImg.alt = 'Thumbnail';
thumbnail.prepend(thumbnailImg);

const itemComponent = function itemComponent({ main, detail }) {
    const { url, thumbnail, height, width, name } = main;

    const item = document.createElement('div');
    item.classList.add('grid-item');
    item.dataset.obj = JSON.stringify(detail);

    const mediaBox = document.createElement('div');
    item.appendChild(mediaBox);
    mediaBox.classList.add('mediabox');

    const img = document.createElement('img');
    mediaBox.appendChild(img);
    img.classList.add('media-box', 'lazyload', 'img');
    img.dataset.sizes = 'auto';
    img.dataset.lowsrc = thumbnail;
    img.dataset.src = url;
    img.width = width;
    img.height = height;
    img.alt = name;

    return item;
};

const modalAnchorComponent = function modalAnchorComponent(link) {
    const anchor = document.createElement('a');
    anchor.target = '_blank';
    anchor.rel = 'noreferrer';
    anchor.href = link;

    return anchor;
};

const modalComponent = function modalComponent(data) {
    const { name, source, source_link, lat, lng } = data;

    const descDiv = document.createElement('div');
    descDiv.classList.add('modal');

    const placeName = document.createElement('p');
    descDiv.appendChild(placeName);
    placeName.textContent = name;

    const sourceLink = modalAnchorComponent(source_link);
    descDiv.appendChild(sourceLink);

    const sourceName = document.createElement('p');
    sourceLink.appendChild(sourceName);
    sourceName.textContent = source;

    const mapLink = modalAnchorComponent(
        `https://maps.google.com/?q=${lat},${lng}`
    );
    descDiv.appendChild(mapLink);

    const button = document.createElement('button');
    mapLink.appendChild(button);

    const pinIcon = document.createElement('i');
    button.appendChild(pinIcon);
    pinIcon.classList.add('fas', 'fa-map-marker-alt');
    button.append('Map');

    return descDiv;
};

const fetchViewsCount = async function fetViews() {
    try {
        const res = await fetch(`https://${serverUrl}/views/count`);
        viewsCount = await res.json();
    } catch (err) {
        console.log(err);
    }
};

const fetchViews = async function fetViews(start = 0) {
    try {
        const res = await fetch(
            `https://${serverUrl}/views?_limit=10&_start=${start}`
        );
        const body = await res.json();
        loadedViews += body.length;
        const data = body.map(
            ({ name, source, source_link, lat, lng, image }) => {
                const { width, height, url, formats } = image;
                const {
                    thumbnail: { url: thumbnail },
                } = formats;
                const main = {
                    url,
                    thumbnail,
                    width,
                    height,
                    name,
                };
                const detail = {
                    name,
                    source,
                    source_link,
                    lat,
                    lng,
                };

                return {
                    main,
                    detail,
                };
            }
        );

        data.forEach((val) => {
            const itemComp = itemComponent(val);
            grid.appendChild(itemComp);

            if (iso) iso.appended(itemComp);
        });

        const gridItems = document.querySelectorAll('.grid-item');
        gridItems.forEach((el) => {
            el.onclick = function onClick(e) {
                const targetName = e.target.tagName;
                const modal = this.querySelector('.modal');

                if (!modal) {
                    const modalData = this.dataset.obj;
                    const modalObj = JSON.parse(modalData);
                    const modalBox = modalComponent(modalObj);
                    this.appendChild(modalBox);
                    this.scrollIntoView({ behavior: 'smooth' });
                    this.classList.add('grid-modal');
                    iso.layout();
                } else if (targetName === 'IMG') {
                    this.classList.remove('grid-modal');
                    modal.remove();
                    iso.layout();
                }
            };
        });
    } catch (err) {
        console.log(err);
    }
};

(async function fetchData() {
    isFetching = true;
    await Promise.all([fetchViews(), fetchViewsCount()]);
    isFetching = false;
    const { default: Isotope } = await import('isotope-layout');
    iso = new Isotope(grid, {
        itemSelector: '.grid-item',
        percentPosition: true,
        masonry: {
            columnWidth: '.grid-sizer',
        },
    });

    observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(async (entry) => {
                if (
                    entry.isIntersecting &&
                    !isFetching &&
                    loadedViews < viewsCount
                ) {
                    isFetching = true;
                    await fetchViews(loadedViews);
                    isFetching = false;
                }
            });
        },
        { threshold: 1 }
    );
    observer.observe(loadMore);
})();

scrollButton.onclick = function onClick() {
    grid.scrollIntoView({ behavior: 'smooth' });
};
