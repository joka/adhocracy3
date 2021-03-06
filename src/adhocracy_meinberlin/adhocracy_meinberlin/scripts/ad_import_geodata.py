"""Script to import GEO-Data to adhocracy meinBerlin."""


import argparse
import inspect
import json
import os
import re
import sys
import textwrap
import unicodedata

from pyramid.paster import bootstrap
from pyramid.registry import Registry

from substanced.util import find_service

import transaction

from adhocracy_core.sheets.name import IName
from adhocracy_core.sheets.title import ITitle
from adhocracy_core.sheets.pool import IPool
from adhocracy_core.interfaces import IResource
from adhocracy_core.resources.geo import ILocationsService
from adhocracy_core.resources.geo import multipolygon_meta
from adhocracy_core.sheets.geo import IMultiPolygon


# Set GDAL_LEGACY flag for GDAL <= 1.10
GDAL_LEGACY = True


def main():
    """Import Berlin districts to adhocracy meinBerlin."""
    doc = textwrap.dedent(inspect.getdoc(main))
    parser = argparse.ArgumentParser(description=doc)
    parser.add_argument('config')
    args = parser.parse_args()

    env = bootstrap(args.config)
    root = env['root']
    registry = env['registry']
    locations = find_service(root, 'locations')

    url = 'http://fbinter.stadt-berlin.de/fb/'\
          'wfs/geometry/senstadt/re_bezirke/'

    _download_geodata('/tmp/bezirke.json', url, 'fis:re_bezirke')

    data = json.load(open('/tmp/bezirke.json', 'r'))

    for feature in data['features']:

        geometry = feature['geometry']['coordinates']
        bezirk = feature['properties']['spatial_alias']
        type = feature['geometry']['type']
        if type == 'Polygon':
            geometry = [geometry]

        geosheet = {'coordinates': geometry,
                    'administrative_division': 'stadtbezirk',
                    'part_of': None,
                    'type': 'MultiPolygon'}

        appstructs = {IName.__identifier__:
                      {'name': 'stadtbezirk-' + _slugify(bezirk)},
                      IMultiPolygon.__identifier__: geosheet,
                      ITitle.__identifier__: {'title': bezirk}
                      }

        _create_multipolygon(registry, appstructs, locations)

    transaction.commit()


def import_bezirksregions():
    """Import Berlin district-regions to adhocracy meinBerlin."""
    doc = textwrap.dedent(inspect.getdoc(import_bezirksregions))
    parser = argparse.ArgumentParser(description=doc)
    parser.add_argument('config')
    args = parser.parse_args()

    env = bootstrap(args.config)
    root = env['root']
    registry = env['registry']
    locations = find_service(root, 'locations')

    url = 'http://fbinter.stadt-berlin.de/fb/'\
          'wfs/geometry/senstadt/re_bezirksregion'
    _download_geodata('/tmp/bezirksregions.json', url, 'fis:re_bezirksregion')

    data = json.load(open('/tmp/bezirksregions.json', 'r'))

    lookup = _fetch_all_districs(root, registry)

    for feature in data['features']:

        geometry = feature['geometry']['coordinates']
        bezirk = feature['properties']['BEZIRK']
        bezirks_region_name = feature['properties']['BZR_NAME']
        type = feature['geometry']['type']
        if type == 'Polygon':
            geometry = [geometry]

        try:
            bezirk_resource = lookup[_slugify(bezirk)]
        except:
            bezirk_resource = None

        geosheet = {'coordinates': geometry,
                    'administrative_division': 'bezirksregion',
                    'part_of': bezirk_resource,
                    'type': 'MultiPolygon'}

        appstructs = {
            IName.__identifier__: {
                'name': 'bezirksregion-' + _slugify(bezirks_region_name)},
            IMultiPolygon.__identifier__: geosheet,
            ITitle.__identifier__: {
                'title': bezirks_region_name}}

        _create_multipolygon(registry, appstructs, locations)

    transaction.commit()


def _slugify(value: str) -> str:
    value = unicodedata.normalize(
        'NFKD',
        value).encode(
        'ascii',
        'ignore').decode('ascii')
    value = re.sub('[^\w\s-]', '', value).strip().lower()
    return re.sub('[-\s]+', '-', value)


def _download_geodata(filename: str, url: str, layer: str):
    call = 'ogr2ogr -s_srs EPSG:25833'\
           ' -t_srs WGS84 -f'\
           ' geoJSON %s WFS:"%s%s" %s' % (
               filename, url, '?TYPENAMES=GML2' if GDAL_LEGACY else '',
               layer)
    try:
        os.remove(filename)
    except:
        pass

    try:
        print('trying to download file from %s' % (url))
        os.system(call)
    except Exception:
        sys.exit()


def _fetch_all_districs(root: IResource, registry: Registry) -> dict:
    pool = registry.content.get_sheet(root, IPool)
    params = {'depth': 3,
              'interfaces': IMultiPolygon,
              }
    results = pool.get(params)
    bezirke = results['elements']
    lookup = {}
    get_sheet_field = registry.content.get_sheet_field
    for bezirk in bezirke:
        division = get_sheet_field(bezirk,
                                   IMultiPolygon,
                                   'administrative_division')
        if division == 'stadtbezirk':
            name = get_sheet_field(bezirk, IName, 'name')
            lookup[name] = bezirk
    return lookup


def _create_multipolygon(registry: Registry,
                         appstructs: dict,
                         locations: ILocationsService):
    try:
        print(
            'creating MultiPolygon Resource for %s' %
            (appstructs[
                ITitle.__identifier__]['title']))
        registry.content.create(
            multipolygon_meta.iresource.__identifier__,
            appstructs=appstructs,
            parent=locations)
    except Exception:
        t, e = sys.exc_info()[:2]
        print(e)
