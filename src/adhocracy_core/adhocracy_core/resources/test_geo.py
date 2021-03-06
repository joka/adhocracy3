from pyramid import testing
from pytest import fixture
from pytest import mark


class TestMultiPolygon:

    @fixture
    def meta(self):
        from .geo import multipolygon_meta
        return multipolygon_meta

    def test_meta(self, meta):
        from adhocracy_core.interfaces import ISimple
        import adhocracy_core.sheets
        from .geo import IMultiPolygon
        assert meta.iresource is IMultiPolygon
        assert meta.use_autonaming is False
        assert IMultiPolygon.isOrExtends(ISimple)
        assert meta.permission_create == 'create_multipolygon'
        assert meta.extended_sheets == (adhocracy_core.sheets.name.IName,
                                        adhocracy_core.sheets.geo.IMultiPolygon,
                                        )

    @mark.usefixtures('integration')
    def test_create(self, pool, registry, meta):
        from adhocracy_core.sheets.name import IName
        appstructs = {IName.__identifier__: {'name': 'name1'}}
        res = registry.content.create(meta.iresource.__identifier__,
                                      appstructs=appstructs,
                                      parent=pool)
        assert meta.iresource.providedBy(res)


class TestService:

    @fixture
    def meta(self):
        from .geo import locations_service_meta
        return locations_service_meta

    def test_meta(self, meta):
        from adhocracy_core.interfaces import IServicePool
        from .geo import IMultiPolygon
        from .geo import ILocationsService
        assert meta.iresource is ILocationsService
        assert ILocationsService.isOrExtends(IServicePool)
        assert meta.content_name == 'locations'
        assert meta.permission_create == 'create_service'
        assert meta.element_types == [IMultiPolygon]

    @mark.usefixtures('integration')
    def test_create(self, pool, registry, meta):
        res = registry.content.create(meta.iresource.__identifier__,
                                      parent=pool)
        assert meta.iresource.providedBy(res)

    @mark.usefixtures('integration')
    def test_add_location_service(self, pool, registry, meta):
        from .geo import add_locations_service
        add_locations_service(pool, registry, {})
        service = pool['locations']
        assert meta.iresource.providedBy(service)
