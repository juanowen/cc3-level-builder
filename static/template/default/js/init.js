const app = new Vue({
    data: {
        style: {
            cell: {
                width: 12,
                height: 12
            },
            field: {
                width: 5,
                height: 5,
                zoom: 1
            }
        }
    },
    beforeMount: () => {

    },
    mounted: () => {

    },
    computed: {
        fieldZoom: {
            get: () => {
                return this.style.field.zoom;
            },
            set: (value) => {
                this.style.field.zoom = value;
            }
        }
    },
    methods: {

    },
    watch: {

    }
});
app.$mount('#app');